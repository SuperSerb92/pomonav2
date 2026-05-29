import { useNavigate } from 'react-router-dom'
import { LogOut, Settings, User, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/context/AuthContext'
import { useSubscription } from '@/context/SubscriptionContext'
import { cn } from '@/lib/utils'

const TIER_STYLES = {
  free: 'bg-gray-100 text-gray-600',
  pro: 'bg-green-100 text-green-700',
  business: 'bg-purple-100 text-purple-700',
}

export function Header() {
  const { user, signOut } = useAuth()
  const { tier } = useSubscription()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-6 shadow-sm">
      <div />
      <div className="flex items-center gap-3">
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize', TIER_STYLES[tier])}>
          {tier}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center gap-2 text-sm font-medium">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-pomona-green/10">
                <User className="h-4 w-4 text-pomona-green" />
              </div>
              <span className="hidden sm:block">{user?.email}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {user?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/pricing')}>
              <CreditCard className="mr-2 h-4 w-4" />
              Upgrade Plan
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
