import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { WorkEvaluation } from '@/types/app.types'
import { toast } from '@/hooks/useToast'

type WorkEvalInput = Omit<WorkEvaluation, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'employee'>

export function useWorkEvaluations() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = ['work_evaluations', user?.id]

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_evaluations')
        .select('*, employee:employees(id, name, surname)')
        .eq('user_id', user!.id)
        .order('eval_date', { ascending: false })
        .limit(200)
      if (error) throw error
      return data as WorkEvaluation[]
    },
    enabled: !!user,
  })

  const create = useMutation({
    mutationFn: async (input: WorkEvalInput) => {
      const { error } = await supabase.from('work_evaluations').insert({ ...input, user_id: user!.id })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: key }); toast({ title: 'Evaluation added' }) },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const update = useMutation({
    mutationFn: async ({ id, ...input }: WorkEvalInput & { id: string }) => {
      const { error } = await supabase.from('work_evaluations').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: key }); toast({ title: 'Evaluation updated' }) },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('work_evaluations').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      const prev = queryClient.getQueryData<WorkEvaluation[]>(key)
      queryClient.setQueryData<WorkEvaluation[]>(key, (old) => old?.filter((e) => e.id !== id) ?? [])
      return { prev }
    },
    onError: (_e, _id, ctx) => { queryClient.setQueryData(key, ctx?.prev) },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return { evaluations, isLoading, create, update, remove }
}
