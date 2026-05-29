export type Tier = 'free' | 'pro' | 'business'

export const TIER_ORDER: Record<Tier, number> = {
  free: 0,
  pro: 1,
  business: 2,
}

export const PLAN_LIMITS = {
  free: { maxEmployees: 5, maxDailyRecords: 20 },
  pro: { maxEmployees: 50, maxDailyRecords: 500 },
  business: { maxEmployees: Infinity, maxDailyRecords: Infinity },
} satisfies Record<Tier, { maxEmployees: number; maxDailyRecords: number }>

export const STRIPE_PRICE_IDS = {
  pro_monthly: import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID as string,
  business_monthly: import.meta.env.VITE_STRIPE_BUSINESS_MONTHLY_PRICE_ID as string,
}

export const PLANS = [
  {
    tier: 'free' as Tier,
    name: 'Free',
    price: 0,
    priceLabel: 'Free forever',
    description: 'Get started with basic farm management',
    features: [
      'Up to 5 employees',
      'Buyers & cultures management',
      'Packaging & plots tracking',
      'Basic dashboard',
    ],
    priceId: null,
  },
  {
    tier: 'pro' as Tier,
    name: 'Pro',
    price: 12,
    priceLabel: '€12 / month',
    description: 'Full operational control for growing farms',
    features: [
      'Up to 50 employees',
      'Everything in Free',
      'Barcode generator & printing',
      'Work evaluation tracking',
      'Repurchase management',
      'Scheduler & calendar',
    ],
    priceId: import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID as string,
  },
  {
    tier: 'business' as Tier,
    name: 'Business',
    price: 25,
    priceLabel: '€25 / month',
    description: 'Advanced insights for enterprise farms',
    features: [
      'Unlimited employees',
      'Everything in Pro',
      'Work summary reports',
      'Profit & loss reports',
      'Interactive farm map',
      '5-day weather forecast',
    ],
    priceId: import.meta.env.VITE_STRIPE_BUSINESS_MONTHLY_PRICE_ID as string,
  },
]
