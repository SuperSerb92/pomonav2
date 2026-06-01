import { useEffect, useState } from 'react'
import JsBarcode from 'jsbarcode'
import { Printer } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/useToast'
import type { Barcode, Profile } from '@/types/app.types'

interface LabelData {
  barcodeValue: string
  lotCode: string
  variety: string
  culture: string
  employeeName: string
  farmName: string
}

interface Props {
  barcode: Barcode | null
  profile: Profile | null | undefined
  onClose: () => void
  onCreateCopies: (copies: number) => Promise<string[]>
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function makeSVGHtml(value: string): string {
  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement
  JsBarcode(svgEl, value, {
    format: 'CODE128',
    width: 1.8,
    height: 55,
    displayValue: true,
    fontSize: 10,
    margin: 4,
    background: '#ffffff',
    lineColor: '#000000',
  })
  const w = svgEl.getAttribute('width') ?? '300'
  const h = svgEl.getAttribute('height') ?? '74'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" style="display:block">${svgEl.innerHTML}</svg>`
}

export function BarcodePrintModal({ barcode, profile, onClose, onCreateCopies }: Props) {
  const [copies, setCopies] = useState(1)
  const [isPrinting, setIsPrinting] = useState(false)

  useEffect(() => {
    if (!barcode) return
    const id = setTimeout(() => {
      document.querySelectorAll<SVGSVGElement>('.pomona-barcode-svg').forEach((el) => {
        JsBarcode(el, barcode.barcode_value, {
          format: 'CODE128',
          width: 1.8,
          height: 55,
          displayValue: true,
          fontSize: 10,
          margin: 4,
          background: '#ffffff',
          lineColor: '#000000',
        })
      })
    }, 50)
    return () => clearTimeout(id)
  }, [barcode])

  async function handlePrint() {
    if (!barcode || isPrinting) return
    setIsPrinting(true)
    try {
      const barcodeValues = await onCreateCopies(copies)

      const makePageHtml = (value: string, isLast: boolean) => `
        <div style="width:3.25in;height:2.20in;box-sizing:border-box;display:flex;flex-direction:column;border:1.5px solid #222;background:#fff;overflow:hidden;${!isLast ? 'page-break-after:always' : ''}">
          <div style="background:#C4B5FD;color:#1C1B2A;padding:5px 10px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0">
            <span style="font-weight:700;font-size:10pt;letter-spacing:0.5px">${esc(farmName)}</span>
            <span style="font-size:7.5pt;opacity:0.9">Origin: Serbia</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;padding:6px 10px 4px;flex-shrink:0">
            <div style="padding-right:8px">
              <div style="font-size:6pt;text-transform:uppercase;letter-spacing:0.4px;color:#888;margin-bottom:1px">Variety</div>
              <div style="font-size:8.5pt;font-weight:600;color:#111">${esc(variety)}</div>
            </div>
            <div style="padding-right:8px">
              <div style="font-size:6pt;text-transform:uppercase;letter-spacing:0.4px;color:#888;margin-bottom:1px">Culture</div>
              <div style="font-size:8.5pt;font-weight:600;color:#111">${esc(culture)}</div>
            </div>
            <div style="padding-right:8px">
              <div style="font-size:6pt;text-transform:uppercase;letter-spacing:0.4px;color:#888;margin-bottom:1px">Lot code</div>
              <div style="font-size:8.5pt;font-weight:600;color:#111">${esc(lotCode)}</div>
            </div>
            <div style="grid-column:1/-1;margin-top:4px">
              <div style="font-size:6pt;text-transform:uppercase;letter-spacing:0.4px;color:#888;margin-bottom:1px">Worker</div>
              <div style="font-size:8.5pt;font-weight:600;color:#111">${esc(employeeName)}</div>
            </div>
          </div>
          <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:0 10px 4px">
            ${makeSVGHtml(value)}
          </div>
        </div>`

      const pages = barcodeValues
        .map((val, i) => makePageHtml(val, i === barcodeValues.length - 1))
        .join('')

      const html = `<!DOCTYPE html>
<html>
<head>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 3.25in 2.20in landscape; margin: 0; }
  html, body {
    font-family: Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
</style>
</head>
<body>${pages}</body>
</html>`

      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const iframe = document.createElement('iframe')
      iframe.setAttribute('aria-hidden', 'true')
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;border:0;width:3.25in;height:2.20in'
      iframe.src = url
      document.body.appendChild(iframe)
      iframe.onload = () => {
        iframe.contentWindow?.print()
        iframe.contentWindow?.addEventListener('afterprint', () => {
          document.body.removeChild(iframe)
          URL.revokeObjectURL(url)
        }, { once: true })
      }
    } catch (e: any) {
      toast({ title: 'Print failed', description: e.message, variant: 'destructive' })
    } finally {
      setIsPrinting(false)
    }
  }

  if (!barcode) return null

  const date = new Date(barcode.created_at)
  const lotCode = `${String(date.getDate()).padStart(2, '0')}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getFullYear()).slice(-2)}`
  const emp = barcode.employee as any
  const employeeName = emp
    ? `${emp.name}${emp.middle_name ? ' ' + emp.middle_name : ''} ${emp.surname}`.replace(/\s+/g, ' ').trim()
    : '—'
  const variety = (barcode.culture_type as any)?.culture_type_name ?? '—'
  const culture = (barcode.culture as any)?.culture_name ?? '—'
  const farmName = profile?.farm_name ?? '—'

  const labelData: LabelData = { barcodeValue: barcode.barcode_value, lotCode, variety, culture, employeeName, farmName }

  return (
    <Dialog open={!!barcode} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[660px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print labels
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Label htmlFor="copies" className="shrink-0">Number of crates</Label>
            <Input
              id="copies"
              type="number"
              min="1"
              max="99"
              value={copies}
              onChange={(e) => setCopies(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
              className="w-20"
            />
            <span className="text-xs text-muted-foreground">
              {copies === 1 ? '1 new barcode will be created and printed' : `${copies} new barcodes will be created and printed — each crate gets its own unique barcode`}
            </span>
          </div>

          {/* Screen preview — shows label layout; each printed copy gets a unique barcode */}
          <div className="border rounded-lg overflow-hidden bg-white">
            <p className="text-[10px] text-muted-foreground px-3 py-1.5 bg-muted/40 border-b">
              Label preview · unique barcode per crate
            </p>
            <div className="p-4 flex justify-center">
              <LabelCard {...labelData} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isPrinting}>Cancel</Button>
            <Button
              className="bg-pomona-green hover:bg-pomona-green/90"
              onClick={handlePrint}
              disabled={isPrinting}
            >
              <Printer className="h-4 w-4 mr-2" />
              {isPrinting ? 'Creating…' : `Print ${copies} ${copies === 1 ? 'label' : 'labels'}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function LabelCard({ lotCode, variety, culture, employeeName, farmName }: LabelData) {
  return (
    <div style={{
      fontFamily: 'Arial, Helvetica, sans-serif',
      width: '3.25in',
      height: '2.20in',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      border: '1.5px solid #222',
      borderRadius: '4px',
      background: '#fff',
      overflow: 'hidden',
    }}>
      <div style={{
        background: '#C4B5FD',
        color: '#1C1B2A',
        padding: '5px 10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: '10pt', letterSpacing: '0.5px' }}>{farmName}</span>
        <span style={{ fontSize: '7.5pt', opacity: 0.9 }}>Origin: Serbia</span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '0',
        padding: '6px 10px 4px',
        flexShrink: 0,
      }}>
        {[
          { label: 'Variety', value: variety },
          { label: 'Culture', value: culture },
          { label: 'Lot code', value: lotCode },
        ].map(({ label, value }) => (
          <div key={label} style={{ paddingRight: '8px' }}>
            <div style={{ fontSize: '6pt', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#888', marginBottom: '1px' }}>{label}</div>
            <div style={{ fontSize: '8.5pt', fontWeight: 600, color: '#111' }}>{value}</div>
          </div>
        ))}
        <div style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
          <div style={{ fontSize: '6pt', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#888', marginBottom: '1px' }}>Worker</div>
          <div style={{ fontSize: '8.5pt', fontWeight: 600, color: '#111' }}>{employeeName}</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px 4px' }}>
        <svg className="pomona-barcode-svg" style={{ width: '100%', display: 'block' }} />
      </div>
    </div>
  )
}
