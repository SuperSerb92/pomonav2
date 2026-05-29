import { Link } from 'react-router-dom'
import {
  Users, ShoppingCart, Leaf, Layers, Package, MapPin,
  QrCode, ClipboardCheck, RefreshCw, CalendarDays,
  BarChart2, TrendingUp, Settings,
  CreditCard,
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
}

export function Sidebar({ farmName }: SidebarProps) {
  const { tier } = useSubscription()

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar-bg border-r border-sidebar-border">
      {/* Logo + farm name */}
      <Link
        to="/dashboard"
        className="flex items-center gap-3 px-5 py-5 hover:opacity-90 transition-opacity"
      >
        <img src={logoDark} alt="Pomona" className="h-20 w-20 rounded-lg" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{farmName || 'Pomona'}</p>
          <p className="text-[10px] text-sidebar-text">Farm Management</p>
        </div>
      </Link>

      <Separator className="bg-sidebar-border" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <SidebarSection label="Master Data">
          <SidebarNavItem href="/employees" icon={Users} label="Employees" />
          <SidebarNavItem href="/buyers" icon={ShoppingCart} label="Buyers" />
          <SidebarNavItem href="/cultures" icon={Leaf} label="Cultures" />
          <SidebarNavItem href="/cultures/types" icon={Layers} label="Culture Types" />
          <SidebarNavItem href="/packaging" icon={Package} label="Packaging" />
          <SidebarNavItem href="/plots" icon={MapPin} label="Plots" />
        </SidebarSection>

        <SidebarSection label="Operations">
          <SidebarNavItem href="/barcode" icon={QrCode} label="Barcode Generator" requiredTier="pro" />
          <SidebarNavItem href="/work-evaluation" icon={ClipboardCheck} label="Work Evaluation" requiredTier="pro" />
          <SidebarNavItem href="/repurchase" icon={RefreshCw} label="Repurchase" requiredTier="pro" />
          <SidebarNavItem href="/scheduler" icon={CalendarDays} label="Scheduler" requiredTier="pro" />
        </SidebarSection>

        <SidebarSection label="Reports">
          <SidebarNavItem href="/reports/work-summary" icon={BarChart2} label="Work Summary" requiredTier="business" />
          <SidebarNavItem href="/reports/profit-loss" icon={TrendingUp} label="Profit & Loss" requiredTier="business" />
        </SidebarSection>


      </nav>

      <Separator className="bg-sidebar-border" />

      {/* Footer */}
      <div className="px-3 py-4 space-y-1">
        <div className="px-3 py-2">
          <span className={cn('text-xs font-semibold rounded-full px-2 py-0.5', TIER_COLOR[tier])}>
            {TIER_LABEL[tier]} Plan
          </span>
        </div>
        <SidebarNavItem href="/pricing" icon={CreditCard} label="Upgrade Plan" />
        <SidebarNavItem href="/settings" icon={Settings} label="Settings" />
      </div>
    </aside>
  )
}
