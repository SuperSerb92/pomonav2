import type { ReactNode } from 'react'
import { useSubscription } from '@/context/SubscriptionContext'
import { UpgradePrompt } from '@/components/shared/UpgradePrompt'
import type { Tier } from '@/lib/constants'

interface PlanRouteProps {
  min: Tier
  children: ReactNode
}

export function PlanRoute({ min, children }: PlanRouteProps) {
  const { canAccess } = useSubscription()

  if (!canAccess(min)) {
    return <UpgradePrompt requiredTier={min} />
  }

  return <>{children}</>
}
