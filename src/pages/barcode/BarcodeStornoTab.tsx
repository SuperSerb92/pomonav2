import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { formatDate } from '@/lib/formatters'
import type { Barcode } from '@/types/app.types'

export function BarcodeStornoTab() {
  const { user } = useAuth()

  const { data: barcodes = [], isLoading } = useQuery({
    queryKey: ['barcodes-storno', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barcodes')
        .select('*, employee:employees(id, name, surname), culture:cultures(id, culture_name), packaging:packaging(id, packaging_type)')
        .eq('user_id', user!.id)
        .eq('is_storno', true)
        .order('storno_at', { ascending: false })
      if (error) throw error
      return data as unknown as Barcode[]
    },
    enabled: !!user,
  })

  if (isLoading) return <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>

  if (barcodes.length === 0)
    return <p className="text-sm text-muted-foreground py-6 text-center">No cancelled barcodes.</p>

  return (
    <div className="rounded-lg border overflow-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Barcode</th>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Employee</th>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Culture</th>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Packaging</th>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Generated</th>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Cancelled at</th>
            <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody>
          {barcodes.map((b) => (
            <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-3 py-2.5">
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{b.barcode_value}</code>
              </td>
              <td className="px-3 py-2.5">
                {b.employee ? `${(b.employee as any).surname} ${(b.employee as any).name}` : '—'}
              </td>
              <td className="px-3 py-2.5">{(b.culture as any)?.culture_name ?? '—'}</td>
              <td className="px-3 py-2.5">{(b.packaging as any)?.packaging_type ?? '—'}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{formatDate(b.created_at)}</td>
              <td className="px-3 py-2.5 text-muted-foreground">
                {b.storno_at ? formatDate(b.storno_at) : '—'}
              </td>
              <td className="px-3 py-2.5 text-center">
                <Badge variant="destructive" className="text-xs">Cancelled</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
