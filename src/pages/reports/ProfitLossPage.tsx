import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency } from '@/lib/formatters'
import { exportProfitLossPdf } from '@/lib/pdfExport'
import { TrendingUp, TrendingDown, DollarSign, FileDown } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'

interface ProfitRow {
  report_date: string
  worker_count: number
  total_boxes: number
  total_expenses: number
  total_revenue: number
  profit: number
}

export default function ProfitLossPage() {
  const { user } = useAuth()
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const [from, setFrom] = useState(thirtyDaysAgo)
  const [to, setTo] = useState(today)

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['profit_loss', user?.id, from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profit_loss_daily')
        .select('*')
        .eq('user_id', user!.id)
        .gte('report_date', from)
        .lte('report_date', to)
        .order('report_date')
      if (error) throw error
      return data as unknown as ProfitRow[]
    },
    enabled: !!user,
  })

  const totalRevenue = rows.reduce((s, r) => s + (r.total_revenue ?? 0), 0)
  const totalExpenses = rows.reduce((s, r) => s + (r.total_expenses ?? 0), 0)
  const totalProfit = rows.reduce((s, r) => s + (r.profit ?? 0), 0)

  const columns: ColumnDef<ProfitRow>[] = [
    { accessorKey: 'report_date', header: 'Date' },
    { accessorKey: 'worker_count', header: 'Workers' },
    { accessorKey: 'total_boxes', header: 'Boxes' },
    { accessorKey: 'total_expenses', header: 'Expenses', cell: ({ getValue }) => formatCurrency(getValue() as number) },
    { accessorKey: 'total_revenue', header: 'Revenue', cell: ({ getValue }) => formatCurrency(getValue() as number) },
    {
      accessorKey: 'profit', header: 'Profit',
      cell: ({ getValue }) => {
        const v = getValue() as number
        return <span className={v >= 0 ? 'text-pomona-green font-medium' : 'text-destructive font-medium'}>{formatCurrency(v)}</span>
      },
    },
  ]

  return (
    <PageContainer>
      <PageHeader title="Profit & Loss" description="Daily financial performance" />

      <Card className="mb-6">
        <CardContent className="pt-5">
          <div className="flex items-end gap-4">
            <div className="space-y-1.5"><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
            <div className="space-y-1.5"><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
            <Button
              variant="outline"
              disabled={rows.length === 0}
              onClick={() => exportProfitLossPdf(rows, from, to, { revenue: totalRevenue, expenses: totalExpenses, profit: totalProfit })}
            >
              <FileDown className="h-4 w-4 mr-2" />Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={TrendingUp} color="green" />
        <StatCard title="Total Expenses" value={formatCurrency(totalExpenses)} icon={TrendingDown} color="lavender" />
        <StatCard title="Net Profit" value={formatCurrency(totalProfit)} icon={DollarSign} color={totalProfit >= 0 ? 'green' : 'default'} />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue vs Expenses vs Profit</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={rows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="report_date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total_revenue" name="Revenue" fill="#2EB88E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total_expenses" name="Expenses" fill="#C4B5FD" radius={[4, 4, 0, 0]} />
                  <Line dataKey="profit" name="Profit" stroke="#F59E0B" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <DataTable columns={columns} data={rows} isLoading={isLoading} />
      </div>
    </PageContainer>
  )
}
