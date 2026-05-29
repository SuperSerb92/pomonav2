import { Link } from 'react-router-dom'
import { MapPin, Settings } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/shared/PageHeader'
import { FarmMap } from '@/components/maps/FarmMap'
import { useProfile } from '@/hooks/useProfile'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function FarmMapPage() {
  const { profile, isLoading } = useProfile()

  const hasLocation = profile?.farm_lat != null && profile?.farm_lng != null

  return (
    <PageContainer>
      <PageHeader
        title="Farm Map"
        description="Your farm location on the map"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings">
              <Settings className="mr-2 h-4 w-4" />
              Set location
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-[600px] w-full rounded-xl" />
      ) : !hasLocation ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1">Location not set</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Add your farm's latitude and longitude in Settings to see it on the map.
            </p>
            <Button asChild className="bg-pomona-green hover:bg-pomona-green/90">
              <Link to="/settings">Go to Settings</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-pomona-green" />
            <span>{profile.farm_name} — {profile.farm_lat?.toFixed(5)}, {profile.farm_lng?.toFixed(5)}</span>
          </div>
          <div className="h-[600px] rounded-xl overflow-hidden border shadow-sm">
            <FarmMap lat={profile.farm_lat!} lng={profile.farm_lng!} farmName={profile.farm_name} />
          </div>
        </div>
      )}
    </PageContainer>
  )
}
