import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import JsBarcode from 'jsbarcode'
import { Printer } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
}

export function BarcodePrintModal({ barcode, profile, onClose }: Props) {
  const [copies, setCopies] = useState(1)

  useEffect(() => {
    if (!barcode) return
    // Small delay ensures SVGs are mounted before JsBarcode runs
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
  }, [barcode, copies])

  function handlePrint() {
    const style = document.createElement('style')
    style.id = 'pomona-print-style'
    style.textContent = `
      @page { size: 5.07in 2in; margin: 0; }
      @media print {
        body > *:not(#pomona-print-labels) { display: none !important; }
        #pomona-print-labels { display: block !important; }
      }
    `
    document.head.appendChild(style)
    window.print()
    window.addEventListener('afterprint', () => {
      document.getElementById('pomona-print-style')?.remove()
    }, { once: true })
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
    <>
      <Dialog open={!!barcode} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[660px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Print label
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Label htmlFor="copies" className="shrink-0">Number of copies</Label>
              <Input
                id="copies"
                type="number"
                min="1"
                max="99"
                value={copies}
                onChange={(e) => setCopies(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
                className="w-20"
              />
            </div>

            {/* Screen preview */}
            <div className="border rounded-lg overflow-hidden bg-white">
              <p className="text-[10px] text-muted-foreground px-3 py-1.5 bg-muted/40 border-b">
                Preview · {copies} {copies === 1 ? 'copy' : 'copies'} will print
              </p>
              <div className="p-4 flex justify-center">
                <LabelCard {...labelData} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button className="bg-pomona-green hover:bg-pomona-green/90" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print{copies > 1 ? ` ${copies} copies` : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print area rendered directly at document.body — outside the Dialog portal tree
          so @media print rules can target it without Dialog wrappers interfering */}
      {createPortal(
        <div id="pomona-print-labels" style={{ display: 'none' }} aria-hidden>
          {Array.from({ length: copies }, (_, i) => (
            <div
              key={i}
              style={{ width: '5.07in', height: '2in', pageBreakAfter: i < copies - 1 ? 'always' : 'avoid' }}
            >
              <LabelCard {...labelData} />
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

function LabelCard({ lotCode, variety, culture, employeeName, farmName }: LabelData) {
  return (
    <div style={{
      fontFamily: 'Arial, Helvetica, sans-serif',
      width: '5.07in',
      height: '2in',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      border: '1.5px solid #222',
      borderRadius: '4px',
      background: '#fff',
      overflow: 'hidden',
    }}>
      {/* Header bar */}
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

      {/* Fields */}
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

      {/* Barcode */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px 4px' }}>
        <svg className="pomona-barcode-svg" style={{ width: '100%', display: 'block' }} />
      </div>
    </div>
  )
}
