import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-8">
      <h1 className="text-6xl font-bold text-muted-foreground/30">404</h1>
      <p className="text-xl font-medium">Page not found</p>
      <p className="text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
      <Button asChild className="bg-pomona-green hover:bg-pomona-green/90">
        <Link to="/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  )
}
