import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    const type = params.get('type')

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (type === 'recovery' && session) {
        navigate('/reset-password', { replace: true })
      } else {
        navigate(session ? '/dashboard' : '/login', { replace: true })
      }
    })
  }, [navigate])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-pomona-green border-t-transparent" />
    </div>
  )
}
