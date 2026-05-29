import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSubscription } from '@/context/SubscriptionContext'
import type { Tier } from '@/lib/constants'

interface SidebarNavItemProps {
  href: string
  icon: LucideIcon
  label: string
  requiredTier?: Tier
}

export function SidebarNavItem({ href, icon: Icon, label, requiredTier }: SidebarNavItemProps) {
  const { canAccess } = useSubscription()
  const locked = requiredTier ? !canAccess(requiredTier) : false

  return (
    <NavLink
      to={href}
      end
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
          isActive
            ? 'bg-sidebar-active text-white font-medium'
            : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white',
          locked && 'opacity-60'
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {locked && <Lock className="h-3 w-3 text-pomona-lavender" />}
    </NavLink>
  )
}
