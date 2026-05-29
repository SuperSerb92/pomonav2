import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const GREEN: [number, number, number] = [46, 184, 142]
const LAVENDER: [number, number, number] = [196, 181, 253]
const FOOT_BG: [number, number, number] = [240, 240, 240]

interface WorkSummaryRow {
  eval_date: string
  employee_full_name: string
  total_neto: number
  total_boxes: number
  total_pay: number
  avg_evaluation: number
}

interface ProfitRow {
  report_date: string
  worker_count: number
  total_boxes: number
  total_expenses: number
  total_revenue: number
  profit: number
}

export function exportWorkSummaryPdf(rows: WorkSummaryRow[], from: string, to: string) {
  const doc = new jsPDF()

  doc.setFontSize(14)
  doc.text('Work Summary Report', 14, 15)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Period: ${from} – ${to}`, 14, 23)

  const totNeto = rows.reduce((s, r) => s + (r.total_neto ?? 0), 0)
  const totBoxes = rows.reduce((s, r) => s + (r.total_boxes ?? 0), 0)
  const totPay = rows.reduce((s, r) => s + (r.total_pay ?? 0), 0)

  autoTable(doc, {
    startY: 29,
    head: [['Date', 'Employee', 'Neto (kg)', 'Boxes', 'Pay (RSD)', 'Avg Rating']],
    body: rows.map((r) => [
      r.eval_date,
      r.employee_full_name,
      r.total_neto?.toFixed(3) ?? '—',
      r.total_boxes ?? '—',
      r.total_pay?.toFixed(0) ?? '—',
      r.avg_evaluation?.toFixed(1) ?? '—',
    ]),
    foot: [['TOTAL', `${rows.length} records`, totNeto.toFixed(3), totBoxes, totPay.toFixed(0), '']],
    styles: { fontSize: 9 },
    headStyles: { fillColor: GREEN, textColor: 255 },
    footStyles: { fillColor: FOOT_BG, fontStyle: 'bold' },
    columnStyles: { 2: { halign: 'right' }, 4: { halign: 'right' } },
  })

  doc.save('Work_Summary_Report.pdf')
}

export function exportProfitLossPdf(
  rows: ProfitRow[],
  from: string,
  to: string,
  totals: { revenue: number; expenses: number; profit: number }
) {
  const doc = new jsPDF('l')

  doc.setFontSize(14)
  doc.text('Profit & Loss Report', 14, 15)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Period: ${from} – ${to}`, 14, 23)

  autoTable(doc, {
    startY: 29,
    head: [['Date', 'Workers', 'Boxes', 'Expenses (RSD)', 'Revenue (RSD)', 'Profit (RSD)']],
    body: rows.map((r) => [
      r.report_date,
      r.worker_count ?? '—',
      r.total_boxes ?? '—',
      r.total_expenses?.toFixed(2) ?? '—',
      r.total_revenue?.toFixed(2) ?? '—',
      r.profit?.toFixed(2) ?? '—',
    ]),
    foot: [[
      'TOTAL',
      '',
      '',
      totals.expenses.toFixed(2),
      totals.revenue.toFixed(2),
      totals.profit.toFixed(2),
    ]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: LAVENDER, textColor: 30 },
    footStyles: { fillColor: FOOT_BG, fontStyle: 'bold' },
    columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
  })

  doc.save('Profit_Loss_Report.pdf')
}
