import { Check } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSubscription } from '@/context/SubscriptionContext'
import { PLANS } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { toast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'

export default function PricingPage() {
  const { tier } = useSubscription()

  const handleUpgrade = async (priceId: string) => {
    if (!priceId) return
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { price_id: priceId },
    })
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return
    }
    window.location.href = data.url
  }

  return (
    <PageContainer className="max-w-5xl">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2">Simple, transparent pricing</h1>
        <p className="text-muted-foreground">Choose the plan that fits your farm's needs</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = tier === plan.tier
          const isBusiness = plan.tier === 'business'

          return (
            <Card
              key={plan.tier}
              className={cn(
                'relative flex flex-col shadow-sm transition-shadow hover:shadow-md',
                isBusiness && 'border-pomona-lavender shadow-pomona-lavender/20',
                isCurrent && 'ring-2 ring-pomona-green'
              )}
            >
              {isBusiness && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-pomona-lavender text-purple-900 text-xs px-3">Most popular</Badge>
                </div>
              )}
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">
                    {plan.price === 0 ? '€0' : `€${plan.price}`}
                  </span>
                  {plan.price > 0 && <span className="text-muted-foreground text-sm">/month</span>}
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 gap-6">
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-pomona-green shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button variant="outline" disabled className="w-full">Current plan</Button>
                ) : plan.priceId ? (
                  <Button
                    onClick={() => handleUpgrade(plan.priceId!)}
                    className={cn(
                      'w-full',
                      isBusiness
                        ? 'bg-pomona-lavender text-purple-900 hover:bg-pomona-lavender/90'
                        : 'bg-pomona-green hover:bg-pomona-green/90'
                    )}
                  >
                    Upgrade to {plan.name}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8">
        All plans include a free trial. Cancel anytime. Stripe handles payments securely.
      </p>
    </PageContainer>
  )
}
