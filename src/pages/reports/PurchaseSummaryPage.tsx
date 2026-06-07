import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { FileDown, CheckCircle2, Circle } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency, formatWeight } from '@/lib/formatters'
import { exportPurchaseSummaryPdf } from '@/lib/pdfExport'
import { toast } from '@/hooks/useToast'
import { DollarSign, TrendingUp, Package } from 'lucide-react'
import type { Repurchase } from '@/types/app.types'

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function PurchaseSummaryPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const today         = localDateStr()
  const thirtyDaysAgo = localDateStr(new Date(Date.now() - 30 * 86400000))
  const [from, setFrom] = useState(thirtyDaysAgo)
  const [to, setTo]     = useState(today)

  const key = ['purchase_summary', user?.id, from, to]

  const { data: rows = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repurchase')
        .select('*, buyer:buyers(id, name), culture:cultures(id, culture_name)')
        .eq('user_id', user!.id)
        .gte('repurchase_date', from)
        .lte('repurchase_date', to)
        .order('repurchase_date', { ascending: false })
      if (error) throw error
      return data as unknown as Repurchase[]
    },
    enabled: !!user,
  })

  // Toggle paid status inline
  const togglePaid = useMutation({
    mutationFn: async ({ id, paid }: { id: string; paid: boolean }) => {
      const { error } = await supabase
        .from('repurchase')
        .update({
          paid,
          paid_date: paid ? localDateStr() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, paid }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const prev = queryClient.getQueryData<Repurchase[]>(key)
      queryClient.setQueryData<Repurchase[]>(key, old =>
        old?.map(r => r.id === id ? { ...r, paid, paid_date: paid ? localDateStr() : null } : r) ?? []
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => { queryClient.setQueryData(key, ctx?.prev); toast({ title: 'Update failed', variant: 'destructive' }) },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  // Totals
  const totIncRsd  = rows.reduce((s, r) => s + (r.income_rsd  ?? 0), 0)
  const totIncEur  = rows.reduce((s, r) => s + (r.income_eur  ?? 0), 0)
  const totNeto    = rows.reduce((s, r) => s + (r.neto         ?? 0), 0)
  const totShipped = rows.reduce((s, r) => s + (r.neto_shipped ?? 0), 0)
  const totBoxes   = rows.reduce((s, r) => s + (r.no_of_boxes  ?? 0), 0)
  const paidCount  = rows.filter(r => r.paid).length
  const avgPriceRsd = totShipped > 0 ? totIncRsd / totShipped : null

  // Chart: income by buyer
  const chartData = Object.values(
    rows.reduce((acc: Record<string, { name: string; income_rsd: number; income_eur: number }>, r) => {
      const k = r.buyer?.name ?? '—'
      if (!acc[k]) acc[k] = { name: k, income_rsd: 0, income_eur: 0 }
      acc[k].income_rsd += r.income_rsd ?? 0
      acc[k].income_eur += r.income_eur ?? 0
      return acc
    }, {})
  )

  function handleExport() {
    exportPurchaseSummaryPdf(rows.map(r => ({
      repurchase_date: r.repurchase_date,
      culture:   r.culture?.culture_name ?? '—',
      buyer:     r.buyer?.name            ?? '—',
      neto:      r.neto,
      neto_shipped: r.neto_shipped,
      difference:   r.difference,
      no_of_boxes:  r.no_of_boxes,
      price_rsd:    r.price_rsd,
      income_rsd:   r.income_rsd,
      income_eur:   r.income_eur,
      paid:         r.paid,
      paid_date:    r.paid_date,
      notes:        r.notes,
    })), from, to)
  }

  return (
    <PageContainer>
      <PageHeader title="Purchase Summary" description="Overview of all crop purchases with payment tracking" />

      {/* Date range + export */}
      <Card className="mb-6">
        <CardContent className="pt-5">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1.5"><Label>From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" /></div>
            <div className="space-y-1.5"><Label>To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" /></div>
            <Button variant="outline" disabled={rows.length === 0} onClick={handleExport}>
              <FileDown className="h-4 w-4 mr-2" />Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <StatCard title="Total Income (RSD)" value={formatCurrency(totIncRsd)}           icon={DollarSign} color="green" />
        <StatCard title="Total Income (EUR)" value={formatCurrency(totIncEur, 'EUR')}    icon={TrendingUp}  color="lavender" />
        <StatCard title="Total Neto"         value={formatWeight(totNeto)}                icon={Package}    color="default" />
        <StatCard title="Paid"               value={`${paidCount} / ${rows.length}`}      icon={CheckCircle2} color={paidCount === rows.length && rows.length > 0 ? 'green' : 'default'} />
      </div>

      <div className="space-y-6">
        {/* Chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">Income by Buyer</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-56 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ paddingTop: 8 }} />
                  <Bar dataKey="income_rsd" name="Income (RSD)" fill="#2EB88E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="income_eur" name="Income (EUR)" fill="#C4B5FD" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                {['Date','Culture','Buyer','Neto (kg)','Net Purch.','Diff.','Boxes','Price/kg','Income RSD','Income EUR','Paid','Notes'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 12 }).map((_, j) => <td key={j} className="px-3 py-3"><Skeleton className="h-4 w-full" /></td>)}
                    </tr>
                  ))
                : rows.length === 0
                ? (
                    <tr><td colSpan={12} className="px-4 py-12 text-center text-muted-foreground text-sm">No purchases found for this period</td></tr>
                  )
                : rows.map(r => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 whitespace-nowrap">{r.repurchase_date}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.culture?.culture_name ?? '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.buyer?.name ?? '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.neto != null ? formatWeight(r.neto) : '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.neto_shipped != null ? formatWeight(r.neto_shipped) : '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.difference != null ? formatWeight(r.difference) : '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.no_of_boxes ?? '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.price_rsd != null ? r.price_rsd.toFixed(4) : '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{r.income_rsd != null ? formatCurrency(r.income_rsd) : '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.income_eur != null ? formatCurrency(r.income_eur, 'EUR') : '—'}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => togglePaid.mutate({ id: r.id, paid: !r.paid })}
                          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                          title={r.paid ? `Paid on ${r.paid_date ?? ''}` : 'Click to mark as paid'}
                        >
                          {r.paid
                            ? <><CheckCircle2 className="h-4 w-4 text-pomona-green" /><Badge className="text-[10px] bg-pomona-green/10 text-pomona-green border-0 px-1.5 py-0">Paid{r.paid_date ? ` · ${r.paid_date}` : ''}</Badge></>
                            : <><Circle className="h-4 w-4 text-muted-foreground" /><Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">Unpaid</Badge></>
                          }
                        </button>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground max-w-32 truncate" title={r.notes ?? ''}>{r.notes || '—'}</td>
                    </tr>
                  ))
              }
            </tbody>
            {rows.length > 0 && (
              <tfoot className="border-t bg-muted/40">
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-xs font-semibold text-muted-foreground">{rows.length} record{rows.length !== 1 ? 's' : ''}</td>
                  <td className="px-3 py-2 text-right text-sm font-semibold">{formatWeight(totNeto)}</td>
                  <td className="px-3 py-2 text-right text-sm font-semibold">{formatWeight(totShipped)}</td>
                  <td />
                  <td className="px-3 py-2 text-right text-sm font-semibold">{totBoxes}</td>
                  <td className="px-3 py-2 text-right text-sm font-semibold">{avgPriceRsd != null ? avgPriceRsd.toFixed(4) : '—'}</td>
                  <td className="px-3 py-2 text-right text-sm font-semibold">{formatCurrency(totIncRsd)}</td>
                  <td className="px-3 py-2 text-right text-sm font-semibold">{formatCurrency(totIncEur, 'EUR')}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </PageContainer>
  )
}
