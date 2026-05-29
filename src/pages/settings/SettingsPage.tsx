import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Settings, MapPin } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProfile } from '@/hooks/useProfile'
import { toast } from '@/hooks/useToast'
import { useSubscription } from '@/context/SubscriptionContext'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

const schema = z.object({
  farm_name: z.string().min(2, 'Farm name is required'),
  farm_no: z.string().optional(),
  farm_lat: z.coerce.number().min(-90).max(90).optional().nullable(),
  farm_lng: z.coerce.number().min(-180).max(180).optional().nullable(),
})
type FormData = z.infer<typeof schema>

export default function SettingsPage() {
  const { profile, isLoading, updateProfile } = useProfile()
  const { subscription } = useSubscription()
  const { user } = useAuth()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
  })

  useEffect(() => {
    if (profile) reset({ farm_name: profile.farm_name, farm_no: profile.farm_no ?? '', farm_lat: profile.farm_lat, farm_lng: profile.farm_lng })
  }, [profile, reset])

  const onSubmit = async (data: FormData) => {
    try {
      await updateProfile.mutateAsync(data)
      toast({ title: 'Settings saved' })
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' })
    }
  }

  const handleManageBilling = async () => {
    if (!subscription?.stripe_customer_id) return
    const { data, error } = await supabase.functions.invoke('create-portal-session')
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    window.location.href = data.url
  }

  return (
    <PageContainer className="max-w-2xl">
      <PageHeader title="Settings" description="Manage your farm profile and billing" />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-pomona-green" /> Farm Profile
            </CardTitle>
            <CardDescription>Your farm details used across the app</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Farm name *</Label>
                  <Input {...register('farm_name')} placeholder="Green Valley Farm" disabled={isLoading} />
                  {errors.farm_name && <p className="text-xs text-destructive">{errors.farm_name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Farm registration number</Label>
                  <Input {...register('farm_no')} placeholder="e.g. 12345678" disabled={isLoading} />
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-pomona-green" />
                  <span className="text-sm font-medium">Farm Location</span>
                  <span className="text-xs text-muted-foreground">(used for Map & Weather)</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Latitude</Label>
                    <Input {...register('farm_lat')} type="number" step="0.000001" placeholder="e.g. 44.786" />
                    {errors.farm_lat && <p className="text-xs text-destructive">{errors.farm_lat.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Longitude</Label>
                    <Input {...register('farm_lng')} type="number" step="0.000001" placeholder="e.g. 20.448" />
                    {errors.farm_lng && <p className="text-xs text-destructive">{errors.farm_lng.message}</p>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Find your coordinates on <a href="https://www.openstreetmap.org" target="_blank" rel="noreferrer" className="text-pomona-green underline">openstreetmap.org</a>
                </p>
              </div>

              <Button type="submit" className="bg-pomona-green hover:bg-pomona-green/90" disabled={isSubmitting || !isDirty}>
                {isSubmitting ? 'Saving…' : 'Save changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            {subscription?.stripe_customer_id && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Billing</p>
                  <p className="text-sm text-muted-foreground capitalize">{subscription.tier} plan · {subscription.status}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleManageBilling}>Manage billing</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
