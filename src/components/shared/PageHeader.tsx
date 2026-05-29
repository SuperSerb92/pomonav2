import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface PageHeaderProps {
  title: string
  description?: string
  onAdd?: () => void
  addLabel?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, onAdd, addLabel = 'Add', actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {onAdd && (
          <Button onClick={onAdd} className="gap-2 bg-pomona-green hover:bg-pomona-green/90">
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
