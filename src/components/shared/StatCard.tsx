import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  color?: 'green' | 'lavender' | 'default'
}

const colorMap = {
  green: 'bg-pomona-green/10 text-pomona-green',
  lavender: 'bg-pomona-lavender/20 text-purple-600',
  default: 'bg-muted text-muted-foreground',
}

export function StatCard({ title, value, icon: Icon, description, color = 'default' }: StatCardProps) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', colorMap[color])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{title}</p>
          <p className="text-xl font-bold leading-tight">{value}</p>
          {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
