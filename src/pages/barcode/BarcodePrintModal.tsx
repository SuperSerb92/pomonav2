import { useEffect, useState } from 'react'
import JsBarcode from 'jsbarcode'
import { Printer } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/useToast'
import type { Barcode, Profile } from '@/types/app.types'

interface LabelData {
  barcodeValue: string
  lotCode: string
  variety: string
  culture: string
  employeeName: string
  farmName: string
  ggn: string
  origin: string
}

interface Props {
  barcodes: Barcode[] | null
  profile: Profile | null | undefined
  onClose: () => void
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

export function BarcodePrintModal({ barcodes, profile, onClose }: Props) {
  const [isPrinting, setIsPrinting] = useState(false)

  const first = barcodes?.[0] ?? null

  useEffect(() => {
    if (!first) return
    const id = setTimeout(() => {
      document.querySelectorAll<SVGSVGElement>('.pomona-barcode-svg').forEach((el) => {
        JsBarcode(el, first.barcode_value, {
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
  }, [first])

  async function handlePrint() {
    if (!barcodes?.length || isPrinting) return
    setIsPrinting(true)
    try {
      const farmName = profile?.farm_name ?? '—'
      const ggn = profile?.ggn ?? ''
      const origin = profile?.origin ?? ''

      const makePageHtml = (b: Barcode, isLast: boolean) => {
        const date = new Date(b.created_at)
        const lotCode = `${String(date.getDate()).padStart(2, '0')}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getFullYear()).slice(-2)}`
        const emp = b.employee
        const employeeName = emp
          ? `${emp.name}${emp.middle_name ? ' ' + emp.middle_name : ''} ${emp.surname}`.replace(/\s+/g, ' ').trim()
          : '—'
        const variety = b.culture_type?.culture_type_name ?? '—'
        const culture = b.culture?.culture_name ?? '—'

        return `
        <div style="width:4.25in;height:2.00in;box-sizing:border-box;display:flex;flex-direction:column;border:1.5px solid #222;background:#fff;overflow:hidden;${!isLast ? 'page-break-after:always' : ''}">
          <div style="background:#C4B5FD;color:#1C1B2A;padding:5px 10px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0">
            <span style="font-weight:700;font-size:10pt;letter-spacing:0.5px">${esc(farmName)}</span>
            ${origin ? `<span style="font-size:7.5pt;opacity:0.9">Origin: ${esc(origin)}</span>` : ''}
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
            <div style="grid-column:1/-1;margin-top:4px;display:flex;gap:16px">
              <div>
                <div style="font-size:6pt;text-transform:uppercase;letter-spacing:0.4px;color:#888;margin-bottom:1px">Worker</div>
                <div style="font-size:8.5pt;font-weight:600;color:#111">${esc(employeeName)}</div>
              </div>
              ${ggn ? `<div>
                <div style="font-size:6pt;text-transform:uppercase;letter-spacing:0.4px;color:#888;margin-bottom:1px">GGN</div>
                <div style="font-size:8.5pt;font-weight:600;color:#111">${esc(ggn)}</div>
              </div>` : ''}
            </div>
          </div>
          <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:0 10px 4px">
            ${makeSVGHtml(b.barcode_value)}
          </div>
        </div>`
      }

      const pages = barcodes.map((b, i) => makePageHtml(b, i === barcodes.length - 1)).join('')

      const html = `<!DOCTYPE html>
<html>
<head>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 4.25in 2.00in landscape; margin: 0; }
  html, body {
    font-family: Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
</style>
</head>
<body>${pages}</body>
</html>`

      const iframe = document.createElement('iframe')
      iframe.setAttribute('aria-hidden', 'true')
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;border:0;width:4.25in;height:2.00in'
      iframe.srcdoc = html
      document.body.appendChild(iframe)
      iframe.onload = () => {
        iframe.contentWindow?.print()
        iframe.contentWindow?.addEventListener('afterprint', () => {
          document.body.removeChild(iframe)
        }, { once: true })
      }
    } catch (e: unknown) {
      toast({ title: 'Print failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' })
    } finally {
      setIsPrinting(false)
    }
  }

  if (!first) return null

  const date = new Date(first.created_at)
  const lotCode = `${String(date.getDate()).padStart(2, '0')}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getFullYear()).slice(-2)}`
  const emp = first.employee
  const employeeName = emp
    ? `${emp.name}${emp.middle_name ? ' ' + emp.middle_name : ''} ${emp.surname}`.replace(/\s+/g, ' ').trim()
    : '—'
  const variety = first.culture_type?.culture_type_name ?? '—'
  const culture = first.culture?.culture_name ?? '—'
  const farmName = profile?.farm_name ?? '—'
  const ggn = profile?.ggn ?? ''
  const origin = profile?.origin ?? ''

  const previewData: LabelData = { barcodeValue: first.barcode_value, lotCode, variety, culture, employeeName, farmName, ggn, origin }
  const count = barcodes?.length ?? 1

  return (
    <Dialog open={!!barcodes?.length} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[660px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print label{count > 1 ? 's' : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Screen preview */}
          <div className="border rounded-lg overflow-hidden bg-white">
            <p className="text-[10px] text-muted-foreground px-3 py-1.5 bg-muted/40 border-b">
              {count === 1
                ? 'Label preview'
                : `Label preview · showing 1 of ${count} — all ${count} labels will be printed`}
            </p>
            <div className="p-4 flex justify-center">
              <LabelCard {...previewData} />
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
              {isPrinting ? 'Printing…' : `Print ${count === 1 ? 'label' : `${count} labels`}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function LabelCard({ lotCode, variety, culture, employeeName, farmName, ggn, origin }: LabelData) {
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
        {origin && <span style={{ fontSize: '7.5pt', opacity: 0.9 }}>Origin: {origin}</span>}
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
        <div style={{ gridColumn: '1 / -1', marginTop: '4px', display: 'flex', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '6pt', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#888', marginBottom: '1px' }}>Worker</div>
            <div style={{ fontSize: '8.5pt', fontWeight: 600, color: '#111' }}>{employeeName}</div>
          </div>
          {ggn && (
            <div>
              <div style={{ fontSize: '6pt', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#888', marginBottom: '1px' }}>GGN</div>
              <div style={{ fontSize: '8.5pt', fontWeight: 600, color: '#111' }}>{ggn}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px 4px' }}>
        <svg className="pomona-barcode-svg" style={{ width: '100%', display: 'block' }} />
      </div>
    </div>
  )
}
