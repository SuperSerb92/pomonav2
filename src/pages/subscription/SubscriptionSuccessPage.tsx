import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSubscription } from '@/context/SubscriptionContext'

export default function SubscriptionSuccessPage() {
  const navigate = useNavigate()
  const { tier } = useSubscription()

  useEffect(() => {
    const timer = setTimeout(() => navigate('/dashboard'), 8000)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-purple-50/20 p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pomona-green/10">
            <CheckCircle className="h-12 w-12 text-pomona-green" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-2">You're all set!</h1>
          <p className="text-muted-foreground">
            Your subscription is now active. Welcome to the{' '}
            <span className="font-semibold capitalize text-pomona-green">{tier}</span> plan.
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard')} className="bg-pomona-green hover:bg-pomona-green/90">
          Go to dashboard
        </Button>
        <p className="text-xs text-muted-foreground">Redirecting automatically in 8 seconds…</p>
      </div>
    </div>
  )
}
