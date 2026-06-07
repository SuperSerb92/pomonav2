import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { FileDown } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { formatWeight, formatCurrency } from '@/lib/formatters'
import { exportWorkSummaryPdf } from '@/lib/pdfExport'
import type { ColumnDef } from '@tanstack/react-table'

interface SummaryRow {
  employee_id: string
  employee_full_name: string
  eval_date: string
  total_neto: number
  total_boxes: number
  total_pay: number
  avg_evaluation: number
}

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function WorkSummaryPage() {
  const { user } = useAuth()
  const today = localDateStr()
  const thirtyDaysAgo = localDateStr(new Date(Date.now() - 30 * 86400000))
  const [from, setFrom] = useState(thirtyDaysAgo)
  const [to, setTo] = useState(today)

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['work_summary', user?.id, from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_summary_by_employee')
        .select('*')
        .eq('user_id', user!.id)
        .gte('eval_date', from)
        .lte('eval_date', to)
        .order('eval_date', { ascending: false })
      if (error) throw error
      return data as unknown as SummaryRow[]
    },
    enabled: !!user,
  })

  const totNeto  = rows.reduce((s, r) => s + (r.total_neto ?? 0), 0)
  const totBoxes = rows.reduce((s, r) => s + (r.total_boxes ?? 0), 0)
  const totPay   = rows.reduce((s, r) => s + (r.total_pay ?? 0), 0)

  const chartData = Object.values(
    rows.reduce((acc: Record<string, { name: string; neto: number; pay: number }>, row) => {
      const key = row.employee_full_name
      if (!acc[key]) acc[key] = { name: key, neto: 0, pay: 0 }
      acc[key].neto += row.total_neto ?? 0
      acc[key].pay += row.total_pay ?? 0
      return acc
    }, {})
  )

  const columns: ColumnDef<SummaryRow>[] = [
    { accessorKey: 'eval_date', header: 'Date' },
    { accessorKey: 'employee_full_name', header: 'Employee' },
    { accessorKey: 'total_neto', header: 'Total Neto', cell: ({ getValue }) => formatWeight(getValue() as number) },
    { accessorKey: 'total_boxes', header: 'Boxes' },
    { accessorKey: 'total_pay', header: 'Total Pay', cell: ({ getValue }) => formatCurrency(getValue() as number) },
    { accessorKey: 'avg_evaluation', header: 'Avg Rating', cell: ({ getValue }) => (getValue() as number)?.toFixed(1) },
  ]

  return (
    <PageContainer>
      <PageHeader title="Work Summary" description="Aggregated work evaluation data by employee" />

      <Card className="mb-6">
        <CardContent className="pt-5">
          <div className="flex items-end gap-4">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
            <Button
              variant="outline"
              disabled={rows.length === 0}
              onClick={() => exportWorkSummaryPdf(rows, from, to)}
            >
              <FileDown className="h-4 w-4 mr-2" />Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Neto vs Pay by Employee</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ paddingTop: 16 }} />
                  <Bar dataKey="neto" name="Total Neto (kg)" fill="#2EB88E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pay" name="Total Pay (RSD)" fill="#C4B5FD" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchColumn="employee_full_name"
          footer={rows.length > 0 ? <>
            <td colSpan={2} className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">{rows.length} record{rows.length !== 1 ? 's' : ''}</td>
            <td className="px-4 py-2.5 text-sm font-semibold">{formatWeight(totNeto)}</td>
            <td className="px-4 py-2.5 text-sm font-semibold">{totBoxes}</td>
            <td className="px-4 py-2.5 text-sm font-semibold">{formatCurrency(totPay)}</td>
            <td />
          </> : undefined}
        />
      </div>
    </PageContainer>
  )
}
