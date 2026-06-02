import { Link } from 'react-router-dom'
import {
  Users, ShoppingCart, Leaf, Layers, Package, MapPin,
  QrCode, ClipboardCheck, RefreshCw, CalendarDays,
  BarChart2, TrendingUp, Settings, CreditCard,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import logoDark from '@/assets/logo-dark.png'
import { SidebarSection } from './SidebarSection'
import { SidebarNavItem } from './SidebarNavItem'
import { useSubscription } from '@/context/SubscriptionContext'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const TIER_LABEL = { free: 'Free', pro: 'Pro', business: 'Business' }
const TIER_COLOR = {
  free: 'bg-gray-500/20 text-gray-300',
  pro: 'bg-pomona-green/20 text-pomona-green',
  business: 'bg-pomona-lavender/20 text-pomona-lavender',
}

interface SidebarProps {
  farmName: string
  isCollapsed: boolean
  onToggle: () => void
}

export function Sidebar({ farmName, isCollapsed, onToggle }: SidebarProps) {
  const { tier } = useSubscription()

  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-sidebar-bg border-r border-sidebar-border transition-all duration-200',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo + toggle */}
      <div className={cn('flex items-center border-b border-sidebar-border', isCollapsed ? 'flex-col py-3 gap-2' : 'px-4 py-4 gap-2')}>
        <Link
          to="/dashboard"
          className={cn('flex items-center gap-3 hover:opacity-90 transition-opacity min-w-0', isCollapsed ? 'justify-center' : 'flex-1')}
          title={isCollapsed ? farmName : undefined}
        >
          <img src={logoDark} alt="Pomona" className="h-8 w-8 rounded-lg shrink-0" />
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{farmName || 'Pomona'}</p>
              <p className="text-[10px] text-sidebar-text">Farm Management</p>
            </div>
          )}
        </Link>
        <button
          onClick={onToggle}
          className="flex items-center justify-center h-6 w-6 rounded-md text-sidebar-text/50 hover:text-white hover:bg-sidebar-hover transition-colors shrink-0"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-5">
        <SidebarSection label="Master Data" isCollapsed={isCollapsed}>
          <SidebarNavItem href="/employees" icon={Users} label="Employees" isCollapsed={isCollapsed} />
          <SidebarNavItem href="/buyers" icon={ShoppingCart} label="Buyers" isCollapsed={isCollapsed} />
          <SidebarNavItem href="/cultures" icon={Leaf} label="Cultures" isCollapsed={isCollapsed} />
          <SidebarNavItem href="/cultures/types" icon={Layers} label="Culture Types" isCollapsed={isCollapsed} />
          <SidebarNavItem href="/packaging" icon={Package} label="Packaging" isCollapsed={isCollapsed} />
          <SidebarNavItem href="/plots" icon={MapPin} label="Plots" isCollapsed={isCollapsed} />
        </SidebarSection>

        <SidebarSection label="Operations" isCollapsed={isCollapsed}>
          <SidebarNavItem href="/barcode" icon={QrCode} label="Barcode Generator" requiredTier="pro" isCollapsed={isCollapsed} />
          <SidebarNavItem href="/work-evaluation" icon={ClipboardCheck} label="Work Evaluation" requiredTier="pro" isCollapsed={isCollapsed} />
          <SidebarNavItem href="/repurchase" icon={RefreshCw} label="Repurchase" requiredTier="pro" isCollapsed={isCollapsed} />
          <SidebarNavItem href="/scheduler" icon={CalendarDays} label="Scheduler" requiredTier="pro" isCollapsed={isCollapsed} />
        </SidebarSection>

        <SidebarSection label="Reports" isCollapsed={isCollapsed}>
          <SidebarNavItem href="/reports/work-summary" icon={BarChart2} label="Work Summary" requiredTier="business" isCollapsed={isCollapsed} />
          <SidebarNavItem href="/reports/profit-loss" icon={TrendingUp} label="Profit & Loss" requiredTier="business" isCollapsed={isCollapsed} />
        </SidebarSection>
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* Footer */}
      <div className="px-2 py-4 space-y-1">
        {!isCollapsed && (
          <div className="px-3 py-2">
            <span className={cn('text-xs font-semibold rounded-full px-2 py-0.5', TIER_COLOR[tier])}>
              {TIER_LABEL[tier]} Plan
            </span>
          </div>
        )}
        <SidebarNavItem href="/pricing" icon={CreditCard} label="Upgrade Plan" isCollapsed={isCollapsed} />
        <SidebarNavItem href="/settings" icon={Settings} label="Settings" isCollapsed={isCollapsed} />
      </div>
    </aside>
  )
}
