import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Subscription } from '@/types/app.types'
import { TIER_ORDER, type Tier } from '@/lib/constants'

interface SubscriptionContextValue {
  subscription: Subscription | null
  tier: Tier
  isActive: boolean
  canAccess: (minTier: Tier) => boolean
  loading: boolean
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null)

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setSubscription(null)
      setLoading(false)
      return
    }

    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setSubscription(data as Subscription | null)
        setLoading(false)
      })

    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setSubscription(payload.new as Subscription)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  const tier: Tier = subscription?.tier ?? 'free'
  const isActive =
    subscription?.status === 'active' ||
    subscription?.status === 'trialing' ||
    tier === 'free'

  const canAccess = (minTier: Tier) => TIER_ORDER[tier] >= TIER_ORDER[minTier]

  return (
    <SubscriptionContext.Provider value={{ subscription, tier, isActive, canAccess, loading }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider')
  return ctx
}
