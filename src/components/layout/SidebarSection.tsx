import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SidebarSectionProps {
  label: string
  children: ReactNode
  className?: string
}

export function SidebarSection({ label, children, className }: SidebarSectionProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-text/50">
        {label}
      </p>
      {children}
    </div>
  )
}
