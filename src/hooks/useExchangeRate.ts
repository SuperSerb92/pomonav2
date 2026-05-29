import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface ExchangeRates {
  srednji: number
  prodajni: number
}

export function useExchangeRate() {
  const [rates, setRates] = useState<ExchangeRates | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchRates() {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-exchange-rate`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      )
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setRates(json as ExchangeRates)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return { rates, loading, error, fetchRates }
}
