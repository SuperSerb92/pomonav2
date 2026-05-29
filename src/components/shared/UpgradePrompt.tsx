import { Link } from 'react-router-dom'
import { Lock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Tier } from '@/lib/constants'

const TIER_LABELS: Record<Tier, string> = {
  free: 'Free',
  pro: 'Pro',
  business: 'Business',
}

interface UpgradePromptProps {
  requiredTier: Tier
}

export function UpgradePrompt({ requiredTier }: UpgradePromptProps) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <Card className="w-full max-w-md border-pomona-lavender/40 bg-gradient-to-br from-white to-purple-50/30 shadow-lg">
        <CardContent className="flex flex-col items-center gap-6 pt-8 pb-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pomona-lavender/20">
            <Lock className="h-8 w-8 text-purple-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">
              {TIER_LABELS[requiredTier]} Plan Required
            </h2>
            <p className="text-sm text-muted-foreground">
              This feature is available on the{' '}
              <span className="font-medium text-purple-600">{TIER_LABELS[requiredTier]}</span>{' '}
              plan and above. Upgrade to unlock it.
            </p>
          </div>
          <Button asChild className="gap-2 bg-pomona-green hover:bg-pomona-green/90">
            <Link to="/pricing">
              <Sparkles className="h-4 w-4" />
              Upgrade to {TIER_LABELS[requiredTier]}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
