import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Employee } from '@/types/app.types'
import { toast } from '@/hooks/useToast'

type EmployeeInput = Pick<Employee, 'name' | 'surname' | 'middle_name' | 'phone_number' | 'recommendation'>

export function useEmployees() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = ['employees', user?.id]

  const { data: employees = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('surname')
      if (error) throw error
      return data as Employee[]
    },
    enabled: !!user,
  })

  const create = useMutation({
    mutationFn: async (input: EmployeeInput) => {
      const { error } = await supabase.from('employees').insert({ ...input, user_id: user!.id })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      toast({ title: 'Employee added', variant: 'default' })
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const update = useMutation({
    mutationFn: async ({ id, ...input }: EmployeeInput & { id: string }) => {
      const { error } = await supabase.from('employees').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      toast({ title: 'Employee updated' })
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employees').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key })
      const prev = queryClient.getQueryData<Employee[]>(key)
      queryClient.setQueryData<Employee[]>(key, (old) => old?.filter((e) => e.id !== id) ?? [])
      return { prev }
    },
    onError: (_e, _id, ctx) => {
      queryClient.setQueryData(key, ctx?.prev)
      toast({ title: 'Error', variant: 'destructive' })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return { employees, isLoading, create, update, remove }
}
