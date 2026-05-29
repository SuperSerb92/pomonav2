import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/context/AuthContext'
import { SubscriptionProvider } from '@/context/SubscriptionContext'
import { Toaster } from '@/components/ui/toaster'
import { router } from '@/router'
import { queryClient } from '@/lib/queryClient'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionProvider>
          <RouterProvider router={router} />
          <Toaster />
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
