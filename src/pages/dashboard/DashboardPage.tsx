import { Link } from 'react-router-dom'
import { LayoutDashboard, Users, ShoppingCart, Leaf, Settings, MapPin, Cloud, Droplets, Wind, Thermometer } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PageContainer } from '@/components/layout/PageContainer'
import { StatCard } from '@/components/shared/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FarmMap } from '@/components/maps/FarmMap'
import { useAuth } from '@/context/AuthContext'
import { useSubscription } from '@/context/SubscriptionContext'
import { useProfile } from '@/hooks/useProfile'
import { useWeather } from '@/hooks/useWeather'
import { supabase } from '@/lib/supabase'
import type { WeatherDay } from '@/types/app.types'

function WeatherCard({ day }: { day: WeatherDay }) {
  const date = new Date(day.date)
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-semibold text-sm">{dayName}</p>
            <p className="text-xs text-muted-foreground">{dateStr}</p>
          </div>
          <img
            src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
            alt={day.condition}
            className="h-10 w-10"
          />
        </div>
        <div className="flex items-center gap-1 text-sm mb-1">
          <Thermometer className="h-3.5 w-3.5 text-orange-400" />
          <span className="font-medium">{Math.round(day.tempMax)}°</span>
          <span className="text-muted-foreground">/ {Math.round(day.tempMin)}°C</span>
        </div>
        <p className="text-xs text-muted-foreground capitalize mb-2">{day.condition}</p>
        <div className="flex items-center gap-3 pt-2 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Droplets className="h-3 w-3 text-blue-400" />{day.humidity}%
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Wind className="h-3 w-3" />{Math.round(day.windSpeed)} m/s
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { tier, canAccess } = useSubscription()
  const { profile, isLoading: profileLoading } = useProfile()
  const { data: forecast, isLoading: weatherLoading } = useWeather(
    profile?.farm_lat ?? null,
    profile?.farm_lng ?? null
  )

  const { data: counts } = useQuery({
    queryKey: ['dashboard-counts', user?.id],
    queryFn: async () => {
      const [emp, buy, cul] = await Promise.all([
        supabase.from('employees').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('buyers').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('cultures').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
      ])
      return { employees: emp.count ?? 0, buyers: buy.count ?? 0, cultures: cul.count ?? 0 }
    },
    enabled: !!user,
  })

  const hasLocation = profile?.farm_lat != null && profile?.farm_lng != null
  const isBusiness = canAccess('business')
  const today = forecast?.[0] ?? null

  return (
    <PageContainer>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {user?.email}</p>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Current Plan"
            value={tier.charAt(0).toUpperCase() + tier.slice(1)}
            icon={LayoutDashboard}
            description="Active subscription"
            color="green"
          />
          <StatCard title="Employees" value={counts?.employees ?? '—'} icon={Users} description="Registered workers" color="lavender" />
          <StatCard title="Buyers" value={counts?.buyers ?? '—'} icon={ShoppingCart} description="Active buyers" color="green" />
          <StatCard title="Cultures" value={counts?.cultures ?? '—'} icon={Leaf} description="Crop types" color="lavender" />
        </div>

        {/* Map + Weather — business tier only */}
        {isBusiness ? (
          <>
            {/* Farm Map */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-pomona-green" />
                    Farm Map
                  </CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/settings">
                      <Settings className="h-3.5 w-3.5 mr-1.5" />Set location
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 pb-0">
                {profileLoading ? (
                  <Skeleton className="h-72 w-full rounded-b-xl" />
                ) : !hasLocation ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center p-6">
                    <MapPin className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Add your farm's coordinates in{' '}
                      <Link to="/settings" className="text-pomona-green hover:underline">Settings</Link>{' '}
                      to see the map.
                    </p>
                  </div>
                ) : (
                  <div className="h-72 rounded-b-xl overflow-hidden">
                    <FarmMap
                      lat={profile.farm_lat!}
                      lng={profile.farm_lng!}
                      farmName={profile.farm_name}
                      weather={today}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 5-day weather forecast */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-blue-400" />
                  5-Day Weather Forecast
                  {profile?.farm_name && (
                    <span className="text-xs font-normal text-muted-foreground ml-1">— {profile.farm_name}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!hasLocation && !profileLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Set your farm location in{' '}
                    <Link to="/settings" className="text-pomona-green hover:underline">Settings</Link>{' '}
                    to see the forecast.
                  </p>
                ) : weatherLoading || profileLoading ? (
                  <div className="grid gap-3 sm:grid-cols-5">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-5">
                    {forecast?.map((day) => <WeatherCard key={day.date} day={day} />)}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="border-dashed border-pomona-lavender/50 bg-pomona-lavender-50/50">
            <CardContent className="flex items-center justify-between py-5 px-6">
              <div>
                <p className="font-semibold text-sm">Farm Map &amp; Weather</p>
                <p className="text-xs text-muted-foreground mt-0.5">Available on the Business plan</p>
              </div>
              <Button size="sm" className="bg-pomona-lavender hover:bg-pomona-lavender/90 text-white" asChild>
                <Link to="/pricing">Upgrade</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Getting started — only show if no location set and business tier */}
        {(!isBusiness || !hasLocation) && (
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold mb-1">Getting Started</h2>
            <p className="text-sm text-muted-foreground">
              Start by adding your employees, crops, and buyers in the Master Data section. Then use
              Operations to track daily work and purchases.
            </p>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
