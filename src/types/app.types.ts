import type { Tier } from '@/lib/constants'

export type { Tier }

export interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  farm_name: string
  farm_no: string | null
  farm_lat: number | null
  farm_lng: number | null
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  user_id: string
  name: string
  surname: string
  middle_name: string | null
  phone_number: string | null
  recommendation: string | null
  is_active: boolean
  created_at: string
}

export interface Buyer {
  id: string
  user_id: string
  name: string
  pib: string | null
  jmbg: string | null
  phone: string | null
  address: string | null
  city: string | null
  email: string | null
  is_active: boolean
  created_at: string
}

export interface Culture {
  id: string
  user_id: string
  culture_name: string
  is_active: boolean
  created_at: string
}

export interface CultureType {
  id: string
  user_id: string
  culture_id: string
  culture_type_name: string
  is_active: boolean
  created_at: string
  culture?: Culture
}

export interface Packaging {
  id: string
  user_id: string
  packaging_type: string
  tara: number
  is_active: boolean
  created_at: string
}

export interface PlotList {
  id: string
  user_id: string
  plot_list_name: string
  created_at: string
}

export interface Plot {
  id: string
  user_id: string
  plot_list_id: string | null
  plot_name: string
  plot_label: string | null
  is_active: boolean
  created_at: string
  plot_list?: PlotList
}

export interface Barcode {
  id: string
  user_id: string
  employee_id: string | null
  culture_id: string | null
  culture_type_id: string | null
  packaging_id: string | null
  plot_id: string | null
  barcode_value: string
  tara: number | null
  neto: number | null
  bruto: number | null
  print_count: number
  is_storno: boolean
  storno_at: string | null
  storno_reason: string | null
  created_at: string
  employee?: Employee
  culture?: Culture
  culture_type?: CultureType
  packaging?: Packaging
  plot?: Plot
}

export interface WorkEvaluation {
  id: string
  user_id: string
  employee_id: string
  eval_date: string
  neto: number | null
  no_of_boxes: number | null
  evaluation: 1 | 2 | 3 | null
  pay_per_day: number | null
  expense_kg: number | null
  total: number | null
  fuel: number | null
  bonus: number | null
  notes: string | null
  created_at: string
  employee?: Employee
}

export interface Repurchase {
  id: string
  user_id: string
  buyer_id: string
  culture_id: string
  repurchase_date: string
  neto: number           // auto-filled from barcodes (harvested quantity)
  neto_shipped: number | null  // actual amount sold to buyer (Net Repurchase)
  difference: number | null    // neto_shipped - neto
  no_of_boxes: number | null
  price_rsd: number | null
  price_eur: number | null
  income_rsd: number | null
  income_eur: number | null
  eur_rate: number | null
  notes: string | null
  paid: boolean
  paid_date: string | null
  created_at: string
  buyer?: Buyer
  culture?: Culture
}

export interface SchedulerEvent {
  id: string
  user_id: string
  title: string
  description: string | null
  start_at: string
  end_at: string | null
  color: string
  employee_id: string | null
  created_at: string
  employee?: Employee
}

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  tier: Tier
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'paused'
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  trial_end: string | null
}

export interface WeatherDay {
  date: string
  tempMin: number
  tempMax: number
  condition: string
  conditionCode: number
  humidity: number
  windSpeed: number
  icon: string
}
