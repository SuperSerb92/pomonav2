import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Plot, PlotList } from '@/types/app.types'
import { toast } from '@/hooks/useToast'

export function usePlotLists() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = ['plot_lists', user?.id]

  const { data: plotLists = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from('plot_lists').select('*').eq('user_id', user!.id).order('plot_list_name')
      if (error) throw error
      return data as PlotList[]
    },
    enabled: !!user,
  })

  const create = useMutation({
    mutationFn: async (plot_list_name: string) => {
      const { error } = await supabase.from('plot_lists').insert({ plot_list_name, user_id: user!.id })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: key }); toast({ title: 'Plot list added' }) },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const update = useMutation({
    mutationFn: async ({ id, plot_list_name }: { id: string; plot_list_name: string }) => {
      const { error } = await supabase.from('plot_lists').update({ plot_list_name }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: key }); toast({ title: 'Plot list updated' }) },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('plot_lists').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      const prev = queryClient.getQueryData<PlotList[]>(key)
      queryClient.setQueryData<PlotList[]>(key, (old) => old?.filter((p) => p.id !== id) ?? [])
      return { prev }
    },
    onError: (_e, _id, ctx) => { queryClient.setQueryData(key, ctx?.prev) },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return { plotLists, isLoading, create, update, remove }
}

type PlotInput = { plot_name: string; plot_label?: string | null; plot_list_id?: string | null }

export function usePlots() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = ['plots', user?.id]

  const { data: plots = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plots')
        .select('*, plot_list:plot_lists(id, plot_list_name)')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('plot_name')
      if (error) throw error
      return data as Plot[]
    },
    enabled: !!user,
  })

  const create = useMutation({
    mutationFn: async (input: PlotInput) => {
      const { error } = await supabase.from('plots').insert({ ...input, user_id: user!.id })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: key }); toast({ title: 'Plot added' }) },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const update = useMutation({
    mutationFn: async ({ id, ...input }: PlotInput & { id: string }) => {
      const { error } = await supabase.from('plots').update(input).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: key }); toast({ title: 'Plot updated' }) },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('plots').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      const prev = queryClient.getQueryData<Plot[]>(key)
      queryClient.setQueryData<Plot[]>(key, (old) => old?.filter((p) => p.id !== id) ?? [])
      return { prev }
    },
    onError: (_e, _id, ctx) => { queryClient.setQueryData(key, ctx?.prev) },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return { plots, isLoading, create, update, remove }
}
