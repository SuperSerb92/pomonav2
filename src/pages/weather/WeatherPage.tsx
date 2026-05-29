import { Link } from 'react-router-dom'
import { Cloud, Droplets, Wind, Thermometer, Settings } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useProfile } from '@/hooks/useProfile'
import { useWeather } from '@/hooks/useWeather'
import type { WeatherDay } from '@/types/app.types'

function WeatherCard({ day }: { day: WeatherDay }) {
  const date = new Date(day.date)
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold">{dayName}</p>
            <p className="text-xs text-muted-foreground">{dateStr}</p>
          </div>
          <img
            src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
            alt={day.condition}
            className="h-12 w-12"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm">
              <Thermometer className="h-3.5 w-3.5 text-orange-400" />
              <span className="font-medium">{Math.round(day.tempMax)}°</span>
              <span className="text-muted-foreground">/ {Math.round(day.tempMin)}°</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground capitalize">{day.condition}</p>
          <div className="flex items-center gap-3 pt-1 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Droplets className="h-3 w-3 text-blue-400" />
              {day.humidity}%
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Wind className="h-3 w-3" />
              {Math.round(day.windSpeed)} m/s
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function WeatherPage() {
  const { profile, isLoading: profileLoading } = useProfile()
  const { data: forecast, isLoading: weatherLoading, error } = useWeather(
    profile?.farm_lat ?? null,
    profile?.farm_lng ?? null
  )

  const hasLocation = profile?.farm_lat != null && profile?.farm_lng != null
  const isLoading = profileLoading || weatherLoading

  return (
    <PageContainer>
      <PageHeader
        title="Weather Forecast"
        description={profile ? `5-day forecast for ${profile.farm_name}` : '5-day forecast for your farm'}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings">
              <Settings className="mr-2 h-4 w-4" />
              Set location
            </Link>
          </Button>
        }
      />

      {!hasLocation && !profileLoading ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Cloud className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1">Location not set</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Add your farm's latitude and longitude in Settings to see weather forecasts.
            </p>
            <Button asChild className="bg-pomona-green hover:bg-pomona-green/90">
              <Link to="/settings">Go to Settings</Link>
            </Button>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-destructive/50">
          <CardContent className="py-8 text-center text-sm text-destructive">
            Failed to load weather data. Check your OpenWeatherMap API key.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)
            : forecast?.map((day) => <WeatherCard key={day.date} day={day} />)
          }
        </div>
      )}
    </PageContainer>
  )
}
